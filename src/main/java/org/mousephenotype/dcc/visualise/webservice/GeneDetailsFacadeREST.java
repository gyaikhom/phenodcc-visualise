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

import java.util.ArrayList;
import javax.ejb.Stateless;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import org.mousephenotype.dcc.entities.overviews.Genotype;

/**
 * Web service for retrieving gene details.
 * 
 * @author gyaikhom
 */
@Stateless
@Path("genedetails")
public class GeneDetailsFacadeREST extends AbstractFacade<Genotype> {

    public GeneDetailsFacadeREST() {
        super(Genotype.class);
    }

    @GET
    @Path("{id}")
    @Produces(MediaType.APPLICATION_JSON)
    public GeneDetailsPack extjsFind(
            @PathParam("id") Integer id) {
        GeneDetailsPack p = new GeneDetailsPack();
        ArrayList<Genotype> t = new ArrayList<>();
        t.add(super.find(id));
        p.setDataSet(t);
        return p;
    }

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public GeneDetailsPack extjsFindAll() {
        GeneDetailsPack p = new GeneDetailsPack();
        p.setDataSet(super.findAll());
        return p;
    }
}
