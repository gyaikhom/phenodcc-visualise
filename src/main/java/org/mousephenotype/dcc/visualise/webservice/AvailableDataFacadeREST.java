/*
 * Copyright 2014 Medical Research Council Harwell.
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

import org.mousephenotype.dcc.entities.impress.Parameter;
import javax.ejb.Stateless;
import javax.persistence.EntityManager;
import javax.persistence.TypedQuery;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;
import javax.ws.rs.core.MediaType;

/**
 * Web service for retrieving parameters.
 *
 * @author Gagarine Yaikhom <g.yaikhom@har.mrc.ac.uk>
 */
@Stateless
@Path("available")
public class AvailableDataFacadeREST extends AbstractFacade<Parameter> {

    private EntityManager em;

    public AvailableDataFacadeREST() {
        super(Parameter.class);
    }

    @GET
    @Path("{pid}")
    @Produces(MediaType.APPLICATION_JSON)
    public AvailableDataPack findProceduresWithData(
            @QueryParam("cid") Integer cid,
            @QueryParam("gid") Integer gid,
            @QueryParam("sid") Integer sid,
            @PathParam("pid") Integer pid) {
        AvailableDataPack p = new AvailableDataPack();
        em = getEntityManager();
        TypedQuery<Integer> q =
                em.createNamedQuery("DataContext.findParametersWithData",
                Integer.class);
        q.setParameter("cid", cid);
        q.setParameter("gid", gid);
        q.setParameter("sid", sid);
        q.setParameter("pid", pid);
        p.setDataSet(q.getResultList());
        em.close();
        return p;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public AvailableDataPack findProceduresWithData(
            @QueryParam("cid") Integer cid,
            @QueryParam("gid") Integer gid,
            @QueryParam("sid") Integer sid) {
        AvailableDataPack p = new AvailableDataPack();
        em = getEntityManager();
        TypedQuery<Integer> q =
                em.createNamedQuery("DataContext.findProceduresWithData",
                Integer.class);
        q.setParameter("cid", cid);
        q.setParameter("gid", gid);
        q.setParameter("sid", sid);
        p.setDataSet(q.getResultList());
        em.close();
        return p;
    }

    @GET
    @Path("centre/{cid}")
    @Produces(MediaType.APPLICATION_JSON)
    public AvailableDataPack findProceduresWithDataCentre(
            @PathParam("cid") Integer cid) {
        AvailableDataPack p = new AvailableDataPack();
        em = getEntityManager();
        TypedQuery<Integer> q =
                em.createNamedQuery("DataContext.findProceduresWithDataForCentre",
                Integer.class);
        q.setParameter("cid", cid);
        p.setDataSet(q.getResultList());
        em.close();
        return p;
    }
}
