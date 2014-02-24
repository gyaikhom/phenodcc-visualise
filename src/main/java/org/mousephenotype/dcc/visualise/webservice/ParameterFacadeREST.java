/*
 * Copyright 2013 Medical Research Council Harwell.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.mousephenotype.dcc.visualise.webservice;

import org.mousephenotype.dcc.entities.impress.ParamIncrement;
import org.mousephenotype.dcc.entities.impress.ProcedureHasParameters;
import org.mousephenotype.dcc.entities.impress.ParameterHasOptions;
import org.mousephenotype.dcc.entities.impress.ParamOption;
import org.mousephenotype.dcc.entities.impress.Parameter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.visualise.entities.ParameterData;

/**
 * Web service for retrieving parameters.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("parameter")
public class ParameterFacadeREST extends AbstractFacade<Parameter> {

    private EntityManager em;

    public ParameterFacadeREST() {
        super(Parameter.class);
    }

    private Integer convertGraphType(String graphType) {
        Integer code = 0;
        switch (graphType) {
            case "1D":
                code = 1;
                break;
            case "2D":
                code = 2;
                break;
            case "CATEGORICAL":
                code = 3;
                break;
        }
        return code;
    }

    private List<String> getOptions(Parameter a) {
        List<String> options = new ArrayList<>();
        Collection<ParameterHasOptions> parameterHasoptions
                = a.getParameterHasOptionsCollection();
        for (ParameterHasOptions p : parameterHasoptions) {
            ParamOption o = p.getParamOptionId();
            if (!o.getDeleted() && o.getIsActive()) {
                options.add(o.getName());
            }
            em.detach(p);
        }
        parameterHasoptions.clear();
        return options;
    }

    private ParameterData fillIncrement(ParameterData pd, Parameter p) {
        Collection<ParamIncrement> phic = p.getParamIncrementCollection();
        Iterator<ParamIncrement> pici = phic.iterator();
        if (pici.hasNext()) {
            ParamIncrement pi = pici.next();
            pd.setIncrementId(pi.getParamIncrementId());
            pd.setIncrementMin(pi.getIncrementMin());
            pd.setIncrementType(pi.getIncrementType());
            pd.setIncrementUnit(pi.getIncrementUnit());
            pd.setIncrementValue(pi.getIncrementString());
            em.detach(pi);
        }
        phic.clear();
        return pd;
    }

    private ParameterData fillParameterDetails(Parameter p) {
        ParameterData pd = new ParameterData();
        if (p != null) {
            Collection<ProcedureHasParameters> c
                    = p.getProcedureHasParametersCollection();
            Iterator<ProcedureHasParameters> i = c.iterator();
            if (i.hasNext()) {
                ProcedureHasParameters php = i.next();
                pd.setProcedureId(php.getProcedureId().getProcedureId());
            }

            pd.setParameterId(p.getParameterId());
            pd.setParameterName(p.getName());
            pd.setStableid(p.getParameterKey());
            pd.setGraphType(convertGraphType(p.getGraphType()));
            pd.setDatatype(p.getValueType());
            pd.setUnit(p.getUnit().getUnit());
            pd.setOptions(getOptions(p));
            pd = this.fillIncrement(pd, p);
        }
        return pd;
    }

    @GET
    @Path("{parameterKey}")
    @Produces(MediaType.APPLICATION_JSON)
    public ParameterData findParameter(
            @PathParam("parameterKey") String parameterKey) {
        ParameterData pd;
        em = getEntityManager();
        TypedQuery<Parameter> q
                = em.createNamedQuery("Parameter.findByParameterKey",
                        Parameter.class);
        q.setParameter("parameterKey", parameterKey);
        pd = fillParameterDetails(q.getSingleResult());
        em.close();
        return pd;
    }

    private HashMap<Integer, ParameterData> getAllParameters() {
        HashMap<Integer, ParameterData> parameters = new HashMap<>();
        TypedQuery<Parameter> query
                = em.createNamedQuery("Parameter.findIMPCParameters",
                        Parameter.class);
        Collection<Parameter> result = query.getResultList();
        for (Parameter q : result) {
            parameters.put(q.getParameterId(), fillParameterDetails(q));
            em.detach(q);
        }
        result.clear();
        return parameters;
    }

    private HashMap<Integer, ParameterData> getSelectedParameters(String keys) {
        HashMap<Integer, ParameterData> parameters = new HashMap<>();
        TypedQuery<Parameter> query
                = em.createNamedQuery("Parameter.findByParameterKeys",
                        Parameter.class);
        query.setParameter("parameterKeys",
                Arrays.asList(keys.split("\\s*,\\s*")));
        Collection<Parameter> result = query.getResultList();
        for (Parameter q : result) {
            parameters.put(q.getParameterId(), fillParameterDetails(q));
            em.detach(q);
        }
        result.clear();
        return parameters;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public ParameterPack findParameters(@QueryParam("q") String parameterKeys) {
        ParameterPack pp = new ParameterPack();
        em = getEntityManager();
        HashMap<Integer, ParameterData> parameters;
        if (parameterKeys == null || parameterKeys.isEmpty()) {
            parameters = getAllParameters();
        } else {
            parameters = getSelectedParameters(parameterKeys);
        }
        pp.setDataSet(new ArrayList<>(parameters.values()));
        parameters.clear();
        em.close();
        return pp;
    }
}
